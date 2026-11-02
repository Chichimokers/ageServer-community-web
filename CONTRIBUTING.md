# Contributing

Thanks for your interest in improving Age Server Community Web. Contributions
of bug reports, documentation, tests, and code are welcome.

## Before opening a pull request

1. For a substantial change, open an issue first to discuss the approach.
2. Keep changes focused and follow the existing TypeScript and React patterns.
3. Do not include server credentials, private keys, certificates containing
   private keys, or personal data in commits or screenshots.
4. Only contribute images or other assets that you have the right to
   redistribute under this project's GPL-3.0 license.
5. Run the checks below and include their results in your pull request.

```sh
npm test
npm run lint
npm run build
```

## Pull requests

Describe the user-visible change, link any related issue, and mention relevant
limitations or follow-up work. Include screenshots for visual changes when
possible. Keep API behavior aligned with the documented public Community API;
do not invent data for endpoints that the server does not provide.
