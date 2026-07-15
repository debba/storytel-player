# [1.3.0](https://github.com/debba/storytel-player/compare/v1.2.16...v1.3.0) (2026-07-15)


### Bug Fixes

* **bookshelf:** correct status mapping for API states ([5b05a53](https://github.com/debba/storytel-player/commit/5b05a53e9742a1156683dd7c383835c2034a62c0))
* **sso:** add retry logic and error logging for firebase token extraction ([ff020bf](https://github.com/debba/storytel-player/commit/ff020bf9ad0d6f84fef6a888346e6e6d73b21054))
* use new Storytel assets endpoint for audiobook download ([0abc0ff](https://github.com/debba/storytel-player/commit/0abc0ff899d302539562508b72cbea8cc03526af)), closes [#26](https://github.com/debba/storytel-player/issues/26)


### Features

* **bookshelf:** add timestamps for sorting books by listening recency ([d467a29](https://github.com/debba/storytel-player/commit/d467a298e8b9f557b4759b80776d3f4cad5af447))
* **electron:** add development scripts and improve server startup ([064dede](https://github.com/debba/storytel-player/commit/064dede3110522135da098dd9aba51393ef36fec))


### Reverts

* Revert "docs: update changelog for firebase token retry fix" ([d6f53f9](https://github.com/debba/storytel-player/commit/d6f53f99e948b30ae19920f8a452f0f1748eb988))

## [1.2.16](https://github.com/debba/storytel-player/compare/v1.2.15...v1.2.16) (2026-07-13)


### Bug Fixes

* **auth:** restore Firebase token refresh ([e9a5cef](https://github.com/debba/storytel-player/commit/e9a5cef78ca6aea5cf27452915d3cae4bb16765f))


### Features

* **error:** keep header visible and add logout on bookshelf error ([1f91d0e](https://github.com/debba/storytel-player/commit/1f91d0e539c3581ee197297e7d84a057b764ba25))

## [1.2.15](https://github.com/debba/storytel-player/compare/v1.2.15-beta1...v1.2.15) (2026-07-10)


### Bug Fixes

* **bookmarks:** close create bookmark modal on cancel/close ([d130f52](https://github.com/debba/storytel-player/commit/d130f52c6f85225a4ed8d28359ddb004247d9179))


### Features

* **storytel:** migrate bookshelf and book details to api.storytel.net ([45e98fc](https://github.com/debba/storytel-player/commit/45e98fcee9bbbc937193b9520d385f8571cdd493))
* **storytel:** stream audio via api.storytel.net assets endpoint ([de62e46](https://github.com/debba/storytel-player/commit/de62e46af97eb3a7e82c8f5d38bbb21a5e551435))

## [1.2.14](https://github.com/debba/storytel-player/compare/v1.2.13...v1.2.14) (2026-05-15)


### Features

* **sso:** add SSO login flow and offline fallbacks ([abdbe98](https://github.com/debba/storytel-player/commit/abdbe98e8edb4477ad909e033c5b12aee8661377))


### Bug Fixes

* **server:** encode Storytel login params ([da15430](https://github.com/debba/storytel-player/commit/da15430f6b5e5bfc53c916c0c3f1158d04022eeb))
* **server:** propagate Storytel 401 login errors ([6cbcd17](https://github.com/debba/storytel-player/commit/6cbcd1760d493639facf26454b8e9aa0888a7cfe))

## [1.2.13](https://github.com/debba/storytel-player/compare/v1.2.12...v1.2.13) (2026-04-03)


### Features

* **docs:** add separate macOS Intel and Apple Silicon downloads ([091c8b5](https://github.com/debba/storytel-player/commit/091c8b5d47bc251c4c4489508f7789e32d4fa733))



## [1.2.12](https://github.com/debba/storytel-player/compare/v1.2.11...v1.2.12) (2026-03-12)


### Features

* **client:** add logs modal and search hotkeys, increase timeouts ([cda8c45](https://github.com/debba/storytel-player/commit/cda8c45179c13622abfcd16076326fdc84ea6daf))
* **server:** add log rotation and size limit for logger ([37e75a5](https://github.com/debba/storytel-player/commit/37e75a57c1a52ed0b0606b3540a403c3bb006fcc))



## [1.2.11](https://github.com/debba/storytel-player/compare/v1.2.10...v1.2.11) (2026-02-25)


### Bug Fixes

* **tray:** set template image on macOS tray icon ([27ae4d1](https://github.com/debba/storytel-player/commit/27ae4d132de810b634064c68f57a79f50aa2fcd3))


### Features

* **tray:** add platform-specific tray icons and use nativeImage ([058087c](https://github.com/debba/storytel-player/commit/058087cf97ce1eeb20298668242b40d2429a167b))



## [1.2.10](https://github.com/debba/storytel-player/compare/v1.2.9...v1.2.10) (2026-02-23)


### Bug Fixes

* **core:** improve 401 handling and error propagation across IPC ([006fa5b](https://github.com/debba/storytel-player/commit/006fa5bfcbf83b43779483f87ae3d97098c4d146))


### Features

* add session expiration handling across client and server ([09c12ca](https://github.com/debba/storytel-player/commit/09c12ca90800803907e56f4738c94645e085715b))



## [1.2.9](https://github.com/debba/storytel-player/compare/v1.2.8...v1.2.9) (2026-02-22)


### Bug Fixes

* **server:** remove duplicate Italian translation import and response ([f5981f5](https://github.com/debba/storytel-player/commit/f5981f54c1138feeb3ef8a25f621ec4c143977ab))


### Features

* **core:** add action logging and multi-language support ([8cdfdbf](https://github.com/debba/storytel-player/commit/8cdfdbfd5cda1837d3248090a7dae88b7f0b68ca))



## [1.2.8](https://github.com/debba/storytel-player/compare/v1.2.7...v1.2.8) (2026-02-17)


### Features

* **settings-modal:** add toggle for always-on-top window setting ([0bf0c31](https://github.com/debba/storytel-player/commit/0bf0c3133b9f69e7d5dbb964652660f8857ea1b7))



