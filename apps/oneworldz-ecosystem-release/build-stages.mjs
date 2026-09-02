const node = (script, env = {}) => Object.freeze({ script, env: Object.freeze(env) });

// This is deliberately an orchestration map, not another content layer.
// The order is the established production order; stages make ownership and
// troubleshooting explicit while build-release.mjs preserves that exact order.
export const buildStages = Object.freeze([
  Object.freeze({
    name: "core-generation",
    steps: Object.freeze([
      node("build.mjs"),
      node("build-expansion.mjs"),
      node("materialize-approved-visuals.mjs", { APPROVED_VISUAL_KEY: "foodworldz" }),
      node("materialize-approved-visuals.mjs", { APPROVED_VISUAL_KEY: "donateworldz" }),
      node("materialize-approved-visuals.mjs", { APPROVED_VISUAL_KEY: "hodlergalaxy" }),
      node("build-perfect.mjs"),
      node("reconcile-perfect-plan.mjs"),
      node("enhance-pdc.mjs"),
      node("build-community-support.mjs")
    ])
  }),
  Object.freeze({
    name: "public-surface",
    steps: Object.freeze([
      node("finalize-oneworldz.mjs"),
      // Supplies the approved GPT artwork to later visual stages.
      node("integrate-oneworldz-gpt.mjs"),
      node("finalize-cryptoworldz.mjs"),
      node("finalize-donation-separation.mjs"),
      node("finalize-jayjay-launch.mjs"),
      node("build-experience.mjs"),
      node("finalize-user-structure.mjs"),
      node("build-special-displays.mjs"),
      node("finalize-support-links.mjs")
    ])
  }),
  Object.freeze({
    name: "discovery-and-theme",
    steps: Object.freeze([
      node("optimize-seo.mjs"),
      node("finalize-breadcrumbs.mjs"),
      node("finalize-themes.mjs"),
      node("fix-oneworldz-mobile.mjs"),
      node("finalize-approved-visual-manifests.mjs"),
      node("write-static-cache-policy.mjs")
    ])
  }),
  Object.freeze({
    name: "visual-experience",
    steps: Object.freeze([
      node("apply-jayjay-images.mjs"),
      node("apply-full-background-experience.mjs"),
      node("perfect-oneworldz.mjs"),
      node("finalize-oneworldz-perfect-layout.mjs"),
      node("perfect-cryptoworldz.mjs"),
      node("finalize-visual-fit.mjs"),
      node("finalize-one-screen-gpt.mjs"),
      node("finalize-pdc-floating.mjs"),
      node("finalize-oneworldz-blueprint-hub.mjs"),
      node("finalize-universal-floating.mjs")
    ])
  }),
  Object.freeze({
    name: "release-integrity",
    // Must run after every page writer. This guard marks every final page with
    // the mobile overflow and responsive-control contract.
    steps: Object.freeze([
      node("finalize-perfect-links.mjs"),
      node("fix-reagan-mobile.mjs"),
      // The GPT browser integration must be last among page writers. Several
      // visual finalizers replace root HTML, so injecting it earlier loses the
      // protected assistant from the final candidate.
      node("integrate-oneworldz-gpt.mjs"),
      node("verify-final-build.mjs")
    ])
  })
]);

export const buildSteps = Object.freeze(buildStages.flatMap(({ steps }) => steps));
