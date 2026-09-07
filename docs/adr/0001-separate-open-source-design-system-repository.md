# 1. Maintain Andes NG in a separate open-source repository

## Status

Accepted

## Context

Andes components must be shared by PEGI and other products with a consistent visual and accessibility contract. Keeping source code inside a single product would couple releases, permissions and contribution flow to that product. The npm scope `@andes-ng` and its organization are not reserved yet; an npm `E404` only proves that the queried public package or organization is not visible, not that ownership is secured.

## Decision

Maintain Andes NG in its own repository and publish its reusable artifacts as public scoped npm packages under the MIT License. Product repositories consume released versions and do not reach into Andes source paths.

The initial local repository is created without a remote. Before the first release, maintainers must create the upstream repository, reserve the npm organization/scope and configure trusted publishing.

## Consequences

- Andes can release independently from PEGI and accept contributions under a clear license.
- Breaking changes require explicit semantic-version and migration discipline.
- CI, security reporting, ownership and release automation become responsibilities of the Andes maintainers.
- Until the npm scope is reserved, package names remain an architectural intent rather than guaranteed registry ownership.

## Sources

- [npm organizations](https://docs.npmjs.com/organizations/)
- [npm package scope and access](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
- [MIT License](https://opensource.org/license/mit)
