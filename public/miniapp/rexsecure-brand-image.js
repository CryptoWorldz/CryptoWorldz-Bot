(function (root, factory) {
  const value = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = value;
  if (root) root.REXSECURE_BRAND_IMAGE = value;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  let chunks = [];
  if (typeof module !== "undefined" && module.exports) {
    chunks = [
      require("./rexsecure-image-part-1"),
      require("./rexsecure-image-part-2"),
      require("./rexsecure-image-part-3"),
      require("./rexsecure-image-part-4"),
      require("./rexsecure-image-part-5"),
      require("./rexsecure-image-part-6"),
      require("./rexsecure-image-part-7"),
      require("./rexsecure-image-part-8"),
      require("./rexsecure-image-part-9")
    ];
  } else {
    chunks = (globalThis.REXSECURE_IMAGE_CHUNKS || []).slice();
  }
  const base64 = chunks.join("");
  return Object.freeze({
    mimeType: "image/jpeg",
    fileName: "rexsecure-ultimate-profile.jpg",
    base64,
    dataUrl: "data:image/jpeg;base64," + base64,
    width: 320,
    height: 400,
    source: "WorldzFullBuild REXSECURE ULTIMATE persona 4/5"
  });
});
