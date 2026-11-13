import deck from "@showcase/deck";
import { defaultTemplate } from "@template/default";

import { bootstrapApp } from "./bootstrap";

// Development-only reference entry: presents the showcase deck at
// /showcase.html on the dev server. Not a build input — production builds and
// the single-file artifact contain only the user deck's entry.
bootstrapApp(deck, defaultTemplate);
