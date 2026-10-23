# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for a suspected vulnerability.

Report it privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Include the affected package and version, the steps to reproduce, and the impact you see. If that option is not available, email the maintainer at [jhosepmyrgutierrezsoto@gmail.com](mailto:jhosepmyrgutierrezsoto@gmail.com).

You will get an acknowledgement within five working days. We then confirm the issue, prepare a fix and publish it with an advisory, crediting you if you wish.

## Supported versions

Andes NG packages (`@andes-ng/ui`, `@andes-ng/tokens`, `@andes-ng/primitives`, `@andes-ng/testing`) share one version and are released together. While the major version is `0`, only the latest release receives fixes.

## What we do about dependencies

Pull requests run dependency, secret and static-analysis scans, and published releases carry npm provenance, so a package can be traced back to the workflow run that built it.
