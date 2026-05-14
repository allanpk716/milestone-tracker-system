# Quick Task: 有一个issues：https://github.com/allanpk716/work-report-skill/issues/134  你来满足这个改进

**Date:** 2026-05-13
**Branch:** gsd/quick/1-issues-https-github-com-allanpk716-work

## What Changed
- `ListDue()` in `internal/remind/remind.go` now queries `TypeMeeting` and `TypeTask` alongside the existing `TypeReminder` and `TypePersonal` types
- `PushDue()` now uses distinct emoji prefixes per type: 📅 meeting, 📋 task, 🏠 personal, ⏰ reminder (default)
- Added 9 new tests covering meeting and task types in both list and push flows

## Files Modified
- `internal/remind/remind.go` — expanded type coverage in `ListDue()`, added meeting/task prefix logic in `PushDue()`
- `internal/remind/remind_test.go` — added tests: `TestListDue_MeetingRecord`, `TestListDue_TaskRecord`, `TestListDue_AllFourTypes`, `TestListDue_FutureMeetingNotDue`, `TestListDue_FutureTaskNotDue`, `TestPushDue_MeetingRecord`, `TestPushDue_TaskRecord`

## Verification
- All existing remind tests pass (`go test ./internal/remind/`)
- All cmd remind tests pass (`go test ./cmd/ -run TestRemind`)
- All 7 new tests pass (meeting/task list + push, including emoji verification)
- PR #135 merged to main via squash: https://github.com/allanpk716/work-report-skill/pull/135
- Issue #134 closed with reference to the fix
