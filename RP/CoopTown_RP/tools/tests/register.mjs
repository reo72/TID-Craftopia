// Test loader: maps the game's script modules to the stubs here. Use:
//   node --import ./register.mjs <name>.test.mjs <BP scripts folder> <RP folder>   (from this folder)
import {register} from 'node:module';register('./hooks.mjs',import.meta.url);
