# Test fixtures (on this computer only)

Everything in this folder but this file is ignored by git: the files hold a client's answers in full, and the
repository is public.

- `baseline.json`: the baseline client's project exported from the server's database by
  `../export_baseline.py` (read-only; how to run it is in its docstring). Export it again when the baseline
  gains data, such as the slot log of Phase 0 item 0.1.
- `baseline.expected.json`: what spec §3.3 and §11.1 say the baseline must show, with the user's decisions of
  21 Nov 2026, written by hand; `audited` holds what today's report shows instead (spec §3.2). Its keys are the
  ones `../test_baseline.py` and `../test_acceptance.py` read.

Without them the tests that need them are skipped, with a line saying which file is missing.
