#!/usr/bin/env bash
# Runs every test here against the dev packs. From this folder:  bash run-all.sh
HERE="$(cd "$(dirname "$0")" && pwd)";RP="$(cd "$HERE/../.." && pwd)";BP="$RP/../../development_behavior_packs/CoopTown_BP/scripts"
cd "$HERE";fail=0
for t in *.test.mjs;do if out=$(node --import ./register.mjs "$t" "$BP" "$RP" 2>&1);then echo "ok   $t";else echo "FAIL $t";echo "$out"|grep -v "MODULE_TYPELESS\|Reparsing\|eliminate\|trace-warn"|grep -m5 -i "error\|assert";fail=1;fi;done
exit $fail
