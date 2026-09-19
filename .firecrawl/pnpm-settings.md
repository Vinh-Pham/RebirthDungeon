[Skip to main content](https://pnpm.io/settings#__docusaurus_skipToContent_fallback)

Learn how to **[Mitigate supply chain attacks with pnpm](https://pnpm.io/supply-chain-security)**

Version: 12.x

On this page

pnpm gets its configuration from the command line, environment variables, and `pnpm-workspace.yaml`.

Only auth and registry settings are read from `.npmrc` files. All other settings (like `hoistPattern`, `nodeLinker`, `shamefullyHoist`, etc.) must be configured in `pnpm-workspace.yaml` or the global `~/.config/pnpm/config.yaml`.

The `pnpm config` command can be used to read and edit the contents of the project and global configuration files.

The relevant configuration files are:

- Per-project configuration file: `/path/to/my/project/pnpm-workspace.yaml`
- [Global configuration file](https://pnpm.io/cli/config)

note

Authorization-related settings are handled via [`.npmrc`](https://pnpm.io/npmrc).

Values in the configuration files may contain env variables using the `${NAME}` syntax. The env variables may also be specified with default values. Using `${NAME-fallback}` will return `fallback` if `NAME` isn't set. `${NAME:-fallback}` will return `fallback` if `NAME` isn't set, or is an empty string.

warning

Since v11.5.3, env variables are **not** expanded in settings of `pnpm-workspace.yaml` that define registry URLs: `registry` and the URL values of [`registries`](https://pnpm.io/settings/dependency-resolution#registries) and [`namedRegistries`](https://pnpm.io/settings/dependency-resolution#namedregistries). Values containing a `${...}` placeholder in these settings are ignored. In the [registry declaration shape](https://pnpm.io/registries) of `registries` (since v11.23.0), the URL is the key rather than the value, and the same rule applies to the keys. Because `pnpm-workspace.yaml` is committed to the repository, expanding env variables in registry URLs could be exploited by a malicious repository to leak secrets from the environment to an attacker-controlled registry. Configure dynamic registry URLs in a trusted location instead: the global configuration file or CLI options.

note

Since v11.22.0, a project's `pnpm-workspace.yaml` cannot choose where pnpm keeps its credentials, its own installation, or other machine-level state: `bin`, `configDir`, `dir`, `globalBinDir`, `globalDir`, `npmrcAuthFile`, `pnpmHomeDir`, `stateDir`, `userconfig`, and `workspaceDir` are ignored there, with a warning. Set them in the [global configuration file](https://pnpm.io/cli/config) or on the command line instead. `cacheDir` and `storeDir` are unaffected.

## packages [​](https://pnpm.io/settings\#packages "Direct link to packages")

Besides settings, `pnpm-workspace.yaml` defines the root of the [workspace](https://pnpm.io/workspaces) and
enables you to include / exclude directories from the workspace. If the
`packages` field is omitted, only the root package is included in the workspace.

For example:

pnpm-workspace.yaml

```yaml
packages:

  # specify a package in a direct subdir of the root

  - 'my-app'

  # all packages in direct subdirs of packages/

  - 'packages/*'

  # all packages in subdirs of components/

  - 'components/**'

  # exclude packages that are inside test directories

  - '!**/test/**'
```

The root package is always included, even when custom location wildcards are
used.

A pattern may be written with a `./` prefix, may contain `.` and `..` segments,
and may repeat slashes: `./packages/*` and `packages//*` select the same
projects, and `!./packages/legacy` excludes the same directory that
`!packages/legacy` does. A `*` never matches a name beginning with a dot, so
`packages/*` skips `packages/.cache`; name such a directory explicitly to
include it.

note

pnpm reads the workspace from `pnpm-workspace.yaml`, not from the `workspaces`
field of the root `package.json`. Since v12.4.1, a root manifest that declares a
non-empty `workspaces` array in a project with no `pnpm-workspace.yaml` gets a
warning, because such an install silently links no project at all.

Catalogs are also defined in the `pnpm-workspace.yaml` file. See [_Catalogs_](https://pnpm.io/catalogs) for details.

pnpm-workspace.yaml

```yaml
packages:

  - 'packages/*'

catalog:

  chalk: ^4.1.2

catalogs:

  react16:

    react: ^16.7.0

    react-dom: ^16.7.0

  react17:

    react: ^17.10.0

    react-dom: ^17.10.0
```

## packageConfigs [​](https://pnpm.io/settings\#packageconfigs "Direct link to packageConfigs")

Added in: v11.0.0

Allows setting project-specific configuration for individual workspace packages. This replaces workspace project-specific `.npmrc` files.

`packageConfigs` can be specified as a map of package names to config objects:

pnpm-workspace.yaml

```yaml
packages:

  - "packages/project-1"

  - "packages/project-2"

packageConfigs:

  "project-1":

    saveExact: true

  "project-2":

    savePrefix: "~"
```

Or as an array of pattern-matched rules:

pnpm-workspace.yaml

```yaml
packages:

  - "packages/project-1"

  - "packages/project-2"

packageConfigs:

  - match: ["project-1", "project-2"]

    modulesDir: "node_modules"

    saveExact: true
```

Settings that shape resolution or the layout of `node_modules` (`overrides`,
`hoist`, `modulesDir`, `saveExact`, `savePrefix`, and their neighbours) take
effect per project only where each project has its own lockfile, that is with
[`sharedWorkspaceLockfile: false`](https://pnpm.io/workspaces#sharedworkspacelockfile). A
workspace on the default shared lockfile has one resolution for every project,
so pnpm reports which entries it ignored instead of applying them silently.

## Settings [​](https://pnpm.io/settings\#settings "Direct link to Settings")

Every setting is listed below, grouped by topic. Follow a setting to read its documentation, or open the full reference of a group.

### Dependency Resolution [​](https://pnpm.io/settings\#dependency-resolution "Direct link to Dependency Resolution")

[Full reference →](https://pnpm.io/settings/dependency-resolution)

- [overrides](https://pnpm.io/settings/dependency-resolution#overrides)
  - [Convergence overrides](https://pnpm.io/settings/dependency-resolution#convergence-overrides)
  - [Overriding peer dependencies](https://pnpm.io/settings/dependency-resolution#overriding-peer-dependencies)
- [packageExtensions](https://pnpm.io/settings/dependency-resolution#packageextensions)
- [allowedDeprecatedVersions](https://pnpm.io/settings/dependency-resolution#alloweddeprecatedversions)
- [update](https://pnpm.io/settings/dependency-resolution#update)
  - [update.ignoreDeps](https://pnpm.io/settings/dependency-resolution#updateignoredeps)
  - [update.changeset](https://pnpm.io/settings/dependency-resolution#updatechangeset)
  - [update.githubActions](https://pnpm.io/settings/dependency-resolution#updategithubactions)
  - [update.githubActionsServer](https://pnpm.io/settings/dependency-resolution#updategithubactionsserver)
- [supportedArchitectures](https://pnpm.io/settings/dependency-resolution#supportedarchitectures)
- [ignoredOptionalDependencies](https://pnpm.io/settings/dependency-resolution#ignoredoptionaldependencies)
- [minimumReleaseAge](https://pnpm.io/settings/dependency-resolution#minimumreleaseage)
- [minimumReleaseAgeExclude](https://pnpm.io/settings/dependency-resolution#minimumreleaseageexclude)
- [minimumReleaseAgeExcludePrune](https://pnpm.io/settings/dependency-resolution#minimumreleaseageexcludeprune)
- [minimumReleaseAgeIgnoreMissingTime](https://pnpm.io/settings/dependency-resolution#minimumreleaseageignoremissingtime)
- [minimumReleaseAgeStrict](https://pnpm.io/settings/dependency-resolution#minimumreleaseagestrict)
- [trustPolicy](https://pnpm.io/settings/dependency-resolution#trustpolicy)
- [trustPolicyExclude](https://pnpm.io/settings/dependency-resolution#trustpolicyexclude)
- [trustPolicyIgnoreAfter](https://pnpm.io/settings/dependency-resolution#trustpolicyignoreafter)
- [trustPolicyExcludePrune](https://pnpm.io/settings/dependency-resolution#trustpolicyexcludeprune)
- [trustLockfile](https://pnpm.io/settings/dependency-resolution#trustlockfile)
- [blockExoticSubdeps](https://pnpm.io/settings/dependency-resolution#blockexoticsubdeps)
- [registries](https://pnpm.io/settings/dependency-resolution#registries)
- [namedRegistries](https://pnpm.io/settings/dependency-resolution#namedregistries)

### Node-Modules Settings [​](https://pnpm.io/settings\#node-modules-settings "Direct link to Node-Modules Settings")

[Full reference →](https://pnpm.io/settings/node-modules#node-modules-settings)

- [modulesDir](https://pnpm.io/settings/node-modules#modulesdir)
- [nodeLinker](https://pnpm.io/settings/node-modules#nodelinker)
- [nodeExperimentalPackageMap](https://pnpm.io/settings/node-modules#nodeexperimentalpackagemap)
- [nodePackageMapType](https://pnpm.io/settings/node-modules#nodepackagemaptype)
- [symlink](https://pnpm.io/settings/node-modules#symlink)
- [enableModulesDir](https://pnpm.io/settings/node-modules#enablemodulesdir)
- [virtualStoreDir](https://pnpm.io/settings/node-modules#virtualstoredir)
- [virtualStoreDirMaxLength](https://pnpm.io/settings/node-modules#virtualstoredirmaxlength)
- [virtualStoreOnly](https://pnpm.io/settings/node-modules#virtualstoreonly)
- [packageImportMethod](https://pnpm.io/settings/node-modules#packageimportmethod)
- [modulesCacheMaxAge](https://pnpm.io/settings/node-modules#modulescachemaxage)
- [dlxCacheMaxAge](https://pnpm.io/settings/node-modules#dlxcachemaxage)
- [virtualStoreType](https://pnpm.io/settings/node-modules#virtualstoretype)
- [enableGlobalVirtualStore](https://pnpm.io/settings/node-modules#enableglobalvirtualstore)

### Dependency Hoisting Settings [​](https://pnpm.io/settings\#dependency-hoisting-settings "Direct link to Dependency Hoisting Settings")

[Full reference →](https://pnpm.io/settings/node-modules#dependency-hoisting-settings)

- [hoist](https://pnpm.io/settings/node-modules#hoist)
- [hoistWorkspacePackages](https://pnpm.io/settings/node-modules#hoistworkspacepackages)
- [hoistPattern](https://pnpm.io/settings/node-modules#hoistpattern)
- [publicHoistPattern](https://pnpm.io/settings/node-modules#publichoistpattern)
- [shamefullyHoist](https://pnpm.io/settings/node-modules#shamefullyhoist)
- [hoistingLimits](https://pnpm.io/settings/node-modules#hoistinglimits)

### Store Settings [​](https://pnpm.io/settings\#store-settings "Direct link to Store Settings")

[Full reference →](https://pnpm.io/settings/store#store-settings)

- [storeDir](https://pnpm.io/settings/store#storedir)
- [verifyStoreIntegrity](https://pnpm.io/settings/store#verifystoreintegrity)
- [useRunningStoreServer](https://pnpm.io/settings/store#userunningstoreserver)
- [strictStorePkgContentCheck](https://pnpm.io/settings/store#strictstorepkgcontentcheck)
- [frozenStore](https://pnpm.io/settings/store#frozenstore)

### Lockfile Settings [​](https://pnpm.io/settings\#lockfile-settings "Direct link to Lockfile Settings")

[Full reference →](https://pnpm.io/settings/store#lockfile-settings)

- [lockfile](https://pnpm.io/settings/store#lockfile)
- [preferFrozenLockfile](https://pnpm.io/settings/store#preferfrozenlockfile)
- [lockfileIncludeTarballUrl](https://pnpm.io/settings/store#lockfileincludetarballurl)
- [gitBranchLockfile](https://pnpm.io/settings/store#gitbranchlockfile)
- [mergeGitBranchLockfilesBranchPattern](https://pnpm.io/settings/store#mergegitbranchlockfilesbranchpattern)
- [peersSuffixMaxLength](https://pnpm.io/settings/store#peerssuffixmaxlength)

### Network Settings [​](https://pnpm.io/settings\#network-settings "Direct link to Network Settings")

[Full reference →](https://pnpm.io/settings/network#network-settings)

- [httpsProxy](https://pnpm.io/settings/network#httpsproxy)
- [httpProxy](https://pnpm.io/settings/network#httpproxy)
- [noProxy](https://pnpm.io/settings/network#noproxy)
- [localAddress](https://pnpm.io/settings/network#localaddress)
- [maxsockets](https://pnpm.io/settings/network#maxsockets)
- [strictSsl](https://pnpm.io/settings/network#strictssl)

### Request Settings [​](https://pnpm.io/settings\#request-settings "Direct link to Request Settings")

[Full reference →](https://pnpm.io/settings/network#request-settings)

- [gitShallowHosts](https://pnpm.io/settings/network#gitshallowhosts)
- [networkConcurrency](https://pnpm.io/settings/network#networkconcurrency)
- [fetchRetries](https://pnpm.io/settings/network#fetchretries)
- [fetchRetryFactor](https://pnpm.io/settings/network#fetchretryfactor)
- [fetchRetryMintimeout](https://pnpm.io/settings/network#fetchretrymintimeout)
- [fetchRetryMaxtimeout](https://pnpm.io/settings/network#fetchretrymaxtimeout)
- [fetchTimeout](https://pnpm.io/settings/network#fetchtimeout)
- [fetchWarnTimeoutMs](https://pnpm.io/settings/network#fetchwarntimeoutms)
- [fetchMinSpeedKiBps](https://pnpm.io/settings/network#fetchminspeedkibps)

### Peer Dependency Settings [​](https://pnpm.io/settings\#peer-dependency-settings "Direct link to Peer Dependency Settings")

[Full reference →](https://pnpm.io/settings/peer-dependencies)

- [autoInstallPeers](https://pnpm.io/settings/peer-dependencies#autoinstallpeers)
  - [Version Conflicts](https://pnpm.io/settings/peer-dependencies#version-conflicts)
  - [Conflict Resolution](https://pnpm.io/settings/peer-dependencies#conflict-resolution)
- [dedupePeerDependents](https://pnpm.io/settings/peer-dependencies#dedupepeerdependents)
- [dedupePeers](https://pnpm.io/settings/peer-dependencies#dedupepeers)
- [strictPeerDependencies](https://pnpm.io/settings/peer-dependencies#strictpeerdependencies)
- [resolvePeersFromWorkspaceRoot](https://pnpm.io/settings/peer-dependencies#resolvepeersfromworkspaceroot)
- [peerDependencyRules](https://pnpm.io/settings/peer-dependencies#peerdependencyrules)
  - [peerDependencyRules.ignoreMissing](https://pnpm.io/settings/peer-dependencies#peerdependencyrulesignoremissing)
  - [peerDependencyRules.allowedVersions](https://pnpm.io/settings/peer-dependencies#peerdependencyrulesallowedversions)
  - [peerDependencyRules.allowAny](https://pnpm.io/settings/peer-dependencies#peerdependencyrulesallowany)

### CLI Settings [​](https://pnpm.io/settings\#cli-settings "Direct link to CLI Settings")

[Full reference →](https://pnpm.io/settings/cli#cli-settings)

- [\[no-\]color](https://pnpm.io/settings/cli#no-color)
- [loglevel](https://pnpm.io/settings/cli#loglevel)
- [useBetaCli](https://pnpm.io/settings/cli#usebetacli)
- [recursiveInstall](https://pnpm.io/settings/cli#recursiveinstall)
- [engineStrict](https://pnpm.io/settings/cli#enginestrict)
- [npmPath](https://pnpm.io/settings/cli#npmpath)
- [pmOnFail](https://pnpm.io/settings/cli#pmonfail)
- [ignoreWorkspaceRootCheck](https://pnpm.io/settings/cli#ignoreworkspacerootcheck)

### Node.js Settings [​](https://pnpm.io/settings\#nodejs-settings "Direct link to Node.js Settings")

[Full reference →](https://pnpm.io/settings/cli#nodejs-settings)

- [nodeVersion](https://pnpm.io/settings/cli#nodeversion)
- [runtimeOnFail](https://pnpm.io/settings/cli#runtimeonfail)
- [nodeDownloadMirrors](https://pnpm.io/settings/cli#nodedownloadmirrors)

### Build Settings [​](https://pnpm.io/settings\#build-settings "Direct link to Build Settings")

[Full reference →](https://pnpm.io/settings/build)

- [ignoreScripts](https://pnpm.io/settings/build#ignorescripts)
- [childConcurrency](https://pnpm.io/settings/build#childconcurrency)
- [sideEffectsCache](https://pnpm.io/settings/build#sideeffectscache)
- [sideEffectsCacheReadonly](https://pnpm.io/settings/build#sideeffectscachereadonly)
- [sideEffectsCache.remote](https://pnpm.io/settings/build#sideeffectscacheremote)
- [unsafePerm](https://pnpm.io/settings/build#unsafeperm)
- [nodeOptions](https://pnpm.io/settings/build#nodeoptions)
- [verifyDepsBeforeRun](https://pnpm.io/settings/build#verifydepsbeforerun)
- [strictDepBuilds](https://pnpm.io/settings/build#strictdepbuilds)
- [allowBuilds](https://pnpm.io/settings/build#allowbuilds)
- [dangerouslyAllowAllBuilds](https://pnpm.io/settings/build#dangerouslyallowallbuilds)

### Versioning Settings [​](https://pnpm.io/settings\#versioning-settings "Direct link to Versioning Settings")

[Full reference →](https://pnpm.io/settings/versioning)

- [versioning.fixed](https://pnpm.io/settings/versioning#versioningfixed)
- [versioning.ignore](https://pnpm.io/settings/versioning#versioningignore)
- [versioning.maxBump](https://pnpm.io/settings/versioning#versioningmaxbump)
- [versioning.lanes](https://pnpm.io/settings/versioning#versioninglanes)
- [versioning.epics](https://pnpm.io/settings/versioning#versioningepics)
- [versioning.changelog.storage](https://pnpm.io/settings/versioning#versioningchangelogstorage)

### Other Settings [​](https://pnpm.io/settings\#other-settings "Direct link to Other Settings")

[Full reference →](https://pnpm.io/settings/other)

- [savePrefix](https://pnpm.io/settings/other#saveprefix)
- [tag](https://pnpm.io/settings/other#tag)
- [globalDir](https://pnpm.io/settings/other#globaldir)
- [globalBinDir](https://pnpm.io/settings/other#globalbindir)
- [npmrcAuthFile](https://pnpm.io/settings/other#npmrcauthfile)
- [stateDir](https://pnpm.io/settings/other#statedir)
- [cacheDir](https://pnpm.io/settings/other#cachedir)
- [useStderr](https://pnpm.io/settings/other#usestderr)
- [updateNotifier](https://pnpm.io/settings/other#updatenotifier)
- [globalShims](https://pnpm.io/settings/other#globalshims)
- [preferSymlinkedExecutables](https://pnpm.io/settings/other#prefersymlinkedexecutables)
- [ignoreCompatibilityDb](https://pnpm.io/settings/other#ignorecompatibilitydb)
- [resolutionMode](https://pnpm.io/settings/other#resolutionmode)
- [registrySupportsTimeField](https://pnpm.io/settings/other#registrysupportstimefield)
- [extendNodePath](https://pnpm.io/settings/other#extendnodepath)
  - [Why this is needed](https://pnpm.io/settings/other#why-this-is-needed)
  - [When to disable](https://pnpm.io/settings/other#when-to-disable)
- [deployAllFiles](https://pnpm.io/settings/other#deployallfiles)
- [dedupeDirectDeps](https://pnpm.io/settings/other#dedupedirectdeps)
- [optimisticRepeatInstall](https://pnpm.io/settings/other#optimisticrepeatinstall)
- [requiredScripts](https://pnpm.io/settings/other#requiredscripts)
- [enablePrePostScripts](https://pnpm.io/settings/other#enableprepostscripts)
- [scriptShell](https://pnpm.io/settings/other#scriptshell)
- [shellEmulator](https://pnpm.io/settings/other#shellemulator)
- [catalogMode](https://pnpm.io/settings/other#catalogmode)
- [ci](https://pnpm.io/settings/other#ci)
- [catalogPrune](https://pnpm.io/settings/other#catalogprune)

### Workspace Settings [​](https://pnpm.io/settings\#workspace-settings "Direct link to Workspace Settings")

These settings are configured in `pnpm-workspace.yaml` as well, but are documented together with the workspace feature they belong to.

[Full reference →](https://pnpm.io/workspaces#configuration)

- [linkWorkspacePackages](https://pnpm.io/workspaces#linkworkspacepackages)
- [injectWorkspacePackages](https://pnpm.io/workspaces#injectworkspacepackages)
- [dedupeInjectedDeps](https://pnpm.io/workspaces#dedupeinjecteddeps)
- [syncInjectedDepsAfterScripts](https://pnpm.io/workspaces#syncinjecteddepsafterscripts)
- [preferWorkspacePackages](https://pnpm.io/workspaces#preferworkspacepackages)
- [sharedWorkspaceLockfile](https://pnpm.io/workspaces#sharedworkspacelockfile)
- [saveWorkspaceProtocol](https://pnpm.io/workspaces#saveworkspaceprotocol)
- [includeWorkspaceRoot](https://pnpm.io/workspaces#includeworkspaceroot)
- [ignoreWorkspaceCycles](https://pnpm.io/workspaces#ignoreworkspacecycles)
- [disallowWorkspaceCycles](https://pnpm.io/workspaces#disallowworkspacecycles)
- [failIfNoMatch](https://pnpm.io/workspaces#failifnomatch)

### Settings documented elsewhere [​](https://pnpm.io/settings\#settings-documented-elsewhere "Direct link to Settings documented elsewhere")

- [patchedDependencies](https://pnpm.io/cli/patch#patcheddependencies)
- [pnpmfile](https://pnpm.io/pnpmfile#pnpmfile), [globalPnpmfile](https://pnpm.io/pnpmfile#globalpnpmfile) and [ignorePnpmfile](https://pnpm.io/pnpmfile#ignorepnpmfile)
- [audit.level](https://pnpm.io/cli/audit#auditlevel), [audit.ignore](https://pnpm.io/cli/audit#auditignore) and [audit.ignorePrune](https://pnpm.io/cli/audit#auditignoreprune)
- [initVersion](https://pnpm.io/cli/init#initversion), [initLicense](https://pnpm.io/cli/init#initlicense) and [initAuthorName / initAuthorEmail / initAuthorUrl](https://pnpm.io/cli/init#initauthorname-initauthoremail-initauthorurl)
- [legacyDirFiltering](https://pnpm.io/filtering#legacydirfiltering)
- [tasks](https://pnpm.io/workspace-task-orchestration#configure-task-dependencies), [pipelines](https://pnpm.io/cli/pipeline#pipelines) and [pipelineBase](https://pnpm.io/cli/pipeline#pipelinebase)
- [cargo.enabled](https://pnpm.io/cargo#cargoenabled) and [cargo.indexUrl](https://pnpm.io/cargo#cargoindexurl)
- [python.enabled](https://pnpm.io/python#pythonenabled), [python.executable](https://pnpm.io/python#pythonexecutable), [python.indexUrl](https://pnpm.io/python#pythonindexurl), [python.extras](https://pnpm.io/python#pythonextras) and [python.groups](https://pnpm.io/python#pythongroups)
- Authorization settings, which are read from [`.npmrc`](https://pnpm.io/npmrc)

- [packages](https://pnpm.io/settings#packages)
- [packageConfigs](https://pnpm.io/settings#packageconfigs)
- [Settings](https://pnpm.io/settings#settings)
  - [Dependency Resolution](https://pnpm.io/settings#dependency-resolution)
  - [Node-Modules Settings](https://pnpm.io/settings#node-modules-settings)
  - [Dependency Hoisting Settings](https://pnpm.io/settings#dependency-hoisting-settings)
  - [Store Settings](https://pnpm.io/settings#store-settings)
  - [Lockfile Settings](https://pnpm.io/settings#lockfile-settings)
  - [Network Settings](https://pnpm.io/settings#network-settings)
  - [Request Settings](https://pnpm.io/settings#request-settings)
  - [Peer Dependency Settings](https://pnpm.io/settings#peer-dependency-settings)
  - [CLI Settings](https://pnpm.io/settings#cli-settings)
  - [Node.js Settings](https://pnpm.io/settings#nodejs-settings)
  - [Build Settings](https://pnpm.io/settings#build-settings)
  - [Versioning Settings](https://pnpm.io/settings#versioning-settings)
  - [Other Settings](https://pnpm.io/settings#other-settings)
  - [Workspace Settings](https://pnpm.io/settings#workspace-settings)
  - [Settings documented elsewhere](https://pnpm.io/settings#settings-documented-elsewhere)