// Single machine-readable release contract.  Workflow scripts may read this
// file, but they must not redefine these values locally.
export const releaseContract = Object.freeze({
  staticTargets: 18,
  architectureDestinations: 19,
  pageRoutes: 93,
  protectedDomain: "cryptobotz.cryptoworldz.xyz"
});

export const { staticTargets, architectureDestinations, pageRoutes, protectedDomain } = releaseContract;
