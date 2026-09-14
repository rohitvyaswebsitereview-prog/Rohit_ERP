# Local build recovery — 13 September 2026

## Recovery update — 14 September 2026

After restart, Node 22 still failed while loading Wrangler despite the installed file matching the integrity-verified npm release. A full build using the bundled Node 24.19.0 runtime with `RAYON_NUM_THREADS=1` completed all five stages. The local service was then started and the root URL returned HTTP 200. Document repository source remains at `ad48139`. This clears the immediate publication blocker; it does not establish the cause of earlier crashes or prove completion of the full ERP review.

The document repository implementation is committed as `ad48139`. Its previous validation passed 156 integration checks, 18 layout checks and TypeScript. A completed production build is still required before claiming these changes are available on localhost.

## Observed failures

- Node 22 and the bundled runtime have both exited with signal 11 during compilation at different stages.
- Restricting native compilation to one thread and processor 0 still exited with code 139.
- Processor 1 produced an invalid-character syntax error in Wrangler at line 128912. A subsequent direct read showed valid source at that line. Three independent file reads produced identical SHA-256 values: `fc1aa72afc91906759a3555e76e6dae1b13504f71dec6d3bbfa0fe24c351ebd7`.
- Kernel logs also recorded general protection and invalid-opcode faults in unrelated processes, including `tr` and `ChatGPT`.
- These observations suggest runtime or system instability; they do not establish a hardware diagnosis.
- Failed builds removed the generated `dist` directory. Do not restart the ERP service until a complete build recreates its configuration and assets. The currently retained service can still answer requests but is not a durable substitute for restoring build outputs.

## Recovery

Save open work and restart the computer before further compilation retries. If failures recur after restart, investigate system memory/storage and runtime integrity before continuing to replace dependencies or changing application logic. Do not delete the local `.wrangler/state` data.

After recovery, run the production build to completion, restart `rohits-erp.service`, confirm localhost responds, and verify the document gallery and authenticated previews. Keep the full Shipzy feature review open; passing this recovery does not complete the remaining ERP scope.
