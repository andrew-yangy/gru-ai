import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PANE_ID_REGEX = /^%\d+$/;

/**
 * Extract the numeric suffix from a tty path like "/dev/ttys060" → 60.
 */
function ttyNumber(tty: string): number | null {
  const m = tty.match(/ttys(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Bring iTerm2 to foreground, bypassing macOS focus-stealing prevention.
 */
async function bringITermToFront(): Promise<void> {
  try {
    await execFileAsync('osascript', ['-l', 'JavaScript', '-e', `
      ObjC.import('AppKit');
      var apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier('com.googlecode.iterm2');
      if (apps.count > 0) {
        apps.objectAtIndex(0).activateWithOptions(3);
        'ok';
      }
    `]);
  } catch {
    // Best effort
  }
}

/**
 * Activate iTerm2 and focus the specific tab containing a tmux client tty.
 *
 * iTerm2 tab ttys differ from tmux client ttys by 1 (the tmux client is a
 * child process of the shell in the iTerm2 tab). So we enumerate all iTerm2
 * tabs, find the one whose tty number is 1 less than the tmux client tty,
 * and select that tab.
 */
async function activateITermTab(tmuxClientTty: string): Promise<void> {
  const targetNum = ttyNumber(tmuxClientTty);

  if (targetNum !== null) {
    // Enumerate iTerm2 windows/tabs/ttys and select the matching one
    const script = `
      tell application "iTerm2"
        repeat with w in windows
          set tabIdx to 0
          repeat with t in tabs of w
            set tabIdx to tabIdx + 1
            repeat with s in sessions of t
              set sessionTty to tty of s
              if sessionTty contains "ttys" then
                set ttyNum to text ((offset of "ttys" in sessionTty) + 4) thru -1 of sessionTty
                try
                  set ttyNum to ttyNum as integer
                  if ttyNum = ${targetNum - 1} then
                    select t
                    set index of w to 1
                    return "found"
                  end if
                end try
              end if
            end repeat
          end repeat
        end repeat
        return "not_found"
      end tell
    `;
    try {
      const { stdout } = await execFileAsync('osascript', ['-e', script]);
      if (stdout.trim() === 'found') {
        await bringITermToFront();
        return;
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: try exact tty match (in case the off-by-1 assumption doesn't hold)
  const fallbackScript = `
    tell application "iTerm2"
      repeat with w in windows
        repeat with t in tabs of w
          repeat with s in sessions of t
            if tty of s = "${tmuxClientTty}" then
              select t
              set index of w to 1
              return "found"
            end if
          end repeat
        end repeat
      end repeat
    end tell
  `;
  try {
    await execFileAsync('osascript', ['-e', fallbackScript]);
  } catch {
    // Best effort
  }

  await bringITermToFront();
}

/**
 * Fallback activation for non-iTerm terminals.
 */
async function activateTerminal(): Promise<void> {
  const bundleIds = [
    'dev.warp.Warp-Stable',
    'com.apple.Terminal',
  ];
  for (const bundleId of bundleIds) {
    try {
      await execFileAsync('osascript', ['-l', 'JavaScript', '-e', `
        ObjC.import('AppKit');
        var apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier('${bundleId}');
        if (apps.count > 0) {
          apps.objectAtIndex(0).activateWithOptions(3);
          'ok';
        } else {
          throw new Error('not running');
        }
      `]);
      return;
    } catch {
      // Try next
    }
  }
}

/**
 * Focus an iTerm2 session directly by its unique ID (non-tmux).
 */
async function focusItermSession(itermId: string): Promise<{ ok: boolean; error?: string }> {
  // Sanitize: iTerm2 unique IDs are alphanumeric with hyphens/dots
  const safeId = itermId.replace(/[^a-zA-Z0-9\-_.]/g, '');
  if (!safeId || safeId !== itermId) {
    return { ok: false, error: `Invalid iTerm session ID: ${itermId}` };
  }

  const script = `
    tell application "iTerm2"
      repeat with w in windows
        repeat with t in tabs of w
          repeat with s in sessions of t
            if unique ID of s is "${safeId}" then
              select t
              set index of w to 1
              return "found"
            end if
          end repeat
        end repeat
      end repeat
      return "not_found"
    end tell
  `;

  try {
    const { stdout } = await execFileAsync('osascript', ['-e', script], { timeout: 5000 });
    if (stdout.trim() === 'found') {
      await bringITermToFront();
      return { ok: true };
    }
    return { ok: false, error: 'iTerm2 session not found' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export async function focusPane(paneId: string): Promise<{ ok: boolean; error?: string }> {
  // Route iTerm2 native sessions (non-tmux)
  if (paneId.startsWith('iterm:')) {
    const itermId = paneId.slice('iterm:'.length);
    return focusItermSession(itermId);
  }

  if (!PANE_ID_REGEX.test(paneId)) {
    return { ok: false, error: `Invalid pane ID format: ${paneId}` };
  }

  try {
    // Check that the pane exists and get its session + window info
    const { stdout: paneInfo } = await execFileAsync('tmux', [
      'display-message', '-p', '-t', paneId,
      '#{session_name}:#{window_id}\t#{pane_id}',
    ]);

    if (!paneInfo.trim().includes(paneId)) {
      return { ok: false, error: `Pane ${paneId} not found` };
    }

    // Get the window ID for tmux switching
    const { stdout: windowId } = await execFileAsync('tmux', [
      'display-message', '-p', '-t', paneId, '#{window_id}',
    ]);
    const trimmedWindowId = windowId.trim();

    // Get the tmux session name
    const { stdout: sessionName } = await execFileAsync('tmux', [
      'display-message', '-p', '-t', paneId, '#{session_name}',
    ]);

    // Find the client tty attached to this tmux session
    const { stdout: clients } = await execFileAsync('tmux', [
      'list-clients', '-F', '#{client_tty}\t#{client_session}',
    ]);
    let clientTty: string | undefined;
    for (const line of clients.trim().split('\n')) {
      const [tty, sess] = line.split('\t');
      if (sess === sessionName.trim()) {
        clientTty = tty;
        break;
      }
    }

    // Select the tmux window and pane
    await execFileAsync('tmux', ['select-window', '-t', trimmedWindowId]);
    await execFileAsync('tmux', ['select-pane', '-t', paneId]);

    // Bring iTerm2 to front and switch to the right tab
    if (clientTty) {
      await activateITermTab(clientTty);
    } else {
      await activateTerminal();
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
