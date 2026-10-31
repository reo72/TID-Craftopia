// Button texts for the job screens (workbench, enchanting table, campfire, anvil, composter, brewing stand).
// The RP takes the look marks ("[on]", "[d4]"...) off a button's text by string subtraction, and a text that then
// starts with a digit is read as a number there ("1 / 3" showed as "1", "1個作成" vanished). A §r (invisible) after
// the marks keeps it a text.
export const keepDigits=text=>String(text).replace(/^((?:\[[a-z0-9]+\])*)(\d)/,'$1§r$2');
