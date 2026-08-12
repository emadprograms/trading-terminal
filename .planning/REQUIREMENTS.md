# Milestone: Order Marker Accuracy

## Background
Currently, visual trade markers (arrows indicating buy/sell points) on the chart appear in random, unpredictable locations rather than aligned perfectly with the executing candle. This causes confusion for traders trying to analyze their entries and exits.

## Requirements
1. **Evident Proof First**: No code changes to the visual implementation can be made without first having a failing test that reproduces the exact timestamp/rendering misalignment.
2. **Accurate Placement**: Buy/Sell arrows must align perfectly with the specific candle where the order was executed.
3. **Hover Interaction**: Hovering over a candle that contains a trade must clearly display the buy/sell arrow or relevant trade information.
4. **Test-Driven Fixes**: Fixes implemented must make the previously written failing test suite turn green.
