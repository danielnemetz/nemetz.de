module.exports = {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-prettier-scss'],
  plugins: ['stylelint-order'],
  ignoreFiles: ['node_modules/**/*', 'dist/**/*', 'public/favicons/**/*'],
  rules: {
    'order/order': null,
    'order/properties-order': null,
    'color-function-notation': null,
    'color-function-alias-notation': null,
    'alpha-value-notation': null,
    'color-hex-length': null,
    'scss/at-mixin-argumentless-call-parentheses': null,
    'property-no-vendor-prefix': null,
    'media-feature-range-notation': null,
    'rule-empty-line-before': null,
    'no-descending-specificity': null,
  },
};
