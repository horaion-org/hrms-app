# The frontend owns all user-facing wording

Every word a person reads in Horaion comes from the app's translation files, so that adding a language means translating one set of files in one repo. The app never displays text the API sends: not a ProblemDetail's `detail` or `title`, not a success response's `message`, and not raw enum constants such as `PENDING_VERIFICATION`. Instead it maps the API's stable codes (`errorCode`, enum constants, HTTP status) to translation keys, with a translated fallback for each status. We rejected localising on the server (Spring `MessageSource` with `Accept-Language`) because the wording would then live in two repos, in two file formats, and the app would still need its own translations for everything else.

## Consequences

The API's English text is for developers and logs only, so ignoring it is deliberate, not an oversight. An error the app needs to explain specifically must carry a stable code. Where the API has no code yet, the app can only show a generic message for that status. Emails that Cognito sends are outside both repos and are not covered by this decision.
