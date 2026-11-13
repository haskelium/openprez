import deck from "@presentation/deck";
import { defaultTemplate } from "@template/default";

import { bootstrapApp } from "./bootstrap";

// App-level composition: this entry presents the user deck in `presentation/`
// through the default template. The showcase deck has its own dev-only entry
// (`showcase.html`); production builds contain only this entry.
bootstrapApp(deck, defaultTemplate);
