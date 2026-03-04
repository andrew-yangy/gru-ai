<!-- Reference: challenger-output.md | Source: SKILL.md restructure -->

# C-Suite Challenger JSON Output Schema

```json
{
  "agent": "{name}",
  "verdict": "endorse | challenge | flag",
  "reasoning": "Your 3-5 sentence evaluation from your domain perspective",
  "alternative": "If challenging: what would you do instead? If endorsing/flagging: null",
  "risk_flags": ["Short risk statements, if any. Empty array if none."]
}
```
