
## Zenith

Use the checked-in .agents/skills/zenith-setup/SKILL.md to prepare this repository for Zenith. Read the Compose, test, and publish skills there as the work progresses. Run `zenith check` after adapting Dockerfile and zenith-compose.yml to the actual app. Keep secrets out of Git.

You do not need Docker installed locally; Zenith builds and runs containers on the platform, so use `zenith up` for previews. Zenith also provides outbound app email through its SMTP relay. Configure x-zenith.env using the Compose skill for previews and published apps.
