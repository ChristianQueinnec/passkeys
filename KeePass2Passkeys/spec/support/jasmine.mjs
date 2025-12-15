export default {
  spec_dir: "spec",
  spec_files: [
      "**/*[sS]pec.mjs"
  ],
  helpers: [
    "helpers/**/*.?(m)js"
  ],
  env: {
    stopSpecOnExpectationFailure: false,
    random: true,
    forbidDuplicateNames: true
  }
}
