## [0.11.3](https://github.com/moe1399/ngx-dynamic-forms/compare/v0.11.2...v0.11.3) (2026-01-20)


### Bug Fixes

* required indicator now respects conditional validation rules ([9eb923d](https://github.com/moe1399/ngx-dynamic-forms/commit/9eb923d5068b03df90a083d65620a6ec04b477ea))
* **table:** prevent actions column from taking excessive width ([c127eb2](https://github.com/moe1399/ngx-dynamic-forms/commit/c127eb2ee24190d8cf518b8171632e9585bd9620))


### Features

* add JSON Schema generation and .NET model code generation ([3807740](https://github.com/moe1399/ngx-dynamic-forms/commit/3807740bdd4574b90ec960f23c71757e9a6bc493))
* **fileupload:** add fileRemoveHandler for server-side file deletion ([3ae8bbe](https://github.com/moe1399/ngx-dynamic-forms/commit/3ae8bbe24a8eecf8f610dcfc1cb2ab64016533d4))
* **fileupload:** add minimum file size validation and fix retry button ([62f80c8](https://github.com/moe1399/ngx-dynamic-forms/commit/62f80c862a4e2e3c846ab2da5c5ee80f92d62a83))



## [0.11.2](https://github.com/moe1399/ngx-dynamic-forms/compare/v0.11.1...v0.11.2) (2026-01-15)


### Features

* add form configuration version history ([db16adf](https://github.com/moe1399/ngx-dynamic-forms/commit/db16adfcdfbbc5067f8a1ab3f6d29ccdcf97178c))
* **form-builder:** add raw JSON editor with validation ([2d8e6b1](https://github.com/moe1399/ngx-dynamic-forms/commit/2d8e6b13f99ace73dcea4213d73f3b22372a58e3))



## [0.11.1](https://github.com/moe1399/ngx-dynamic-forms/compare/v0.11.0...v0.11.1) (2026-01-13)


* feat!: remove UI properties from FormConfig, add showFormSettings input ([2c04a5f](https://github.com/moe1399/ngx-dynamic-forms/commit/2c04a5fd67a7e70ad57c0dbcf86fb6a8600e25fc))


### Bug Fixes

* improve wizard progress indicator styling and responsiveness ([f91efc8](https://github.com/moe1399/ngx-dynamic-forms/commit/f91efc8751a92b682d13960af488d93d5799234f))


### Features

* add autocomplete field type with API search ([0754db9](https://github.com/moe1399/ngx-dynamic-forms/commit/0754db9e0c51b5e6871af434ee6ccdb3eea8a2b2))
* add wizard mode for multi-page forms ([2e55caf](https://github.com/moe1399/ngx-dynamic-forms/commit/2e55caff2b9ed9b2a9dabb0e73c3d2bbcaca822e))


### BREAKING CHANGES

* FormConfig no longer includes submitLabel, saveLabel,
autoSave, or autoSaveInterval properties. Consumers must now define
button labels in their templates and implement auto-save manually.



# [0.11.0](https://github.com/moe1399/ngx-dynamic-forms/compare/v0.9.0...v0.11.0) (2026-01-12)


### Bug Fixes

* improve select field UX and readonly mode behavior ([d5987e5](https://github.com/moe1399/ngx-dynamic-forms/commit/d5987e57b07b95a3956453a924cd2d0cd956bf6d))


### Features

* add conditional visibility for sections and fields ([0ba7290](https://github.com/moe1399/ngx-dynamic-forms/commit/0ba72909df8ba0183efc64ffcf57ab34ad3faac3))
* **demo:** add form builder theme CSS section to Theme CSS page ([b22e567](https://github.com/moe1399/ngx-dynamic-forms/commit/b22e5672c691952ced81f8927b64bb923f03f225))



# [0.9.0](https://github.com/moe1399/ngx-dynamic-forms/compare/v0.5.4...v0.9.0) (2026-01-12)


### Features

* add named async validators with loading indicator ([435be5d](https://github.com/moe1399/ngx-dynamic-forms/commit/435be5d4bfba1c6b00a435524ee7ff97af363b81))



## 0.5.4 (2026-01-11)



