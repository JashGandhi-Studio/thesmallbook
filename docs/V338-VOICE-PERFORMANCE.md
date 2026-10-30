# TheSmallBook v338 voice and performance release

## Reader behaviour

- Every book-level **Listen** action now opens the single broadcast player used by the Listen room.
- If the relevant TheSmallBook Voice Model is not installed, Listen opens its explicit setup sheet. It does not start a fallback narrator first.
- After the reader or parent chooses and downloads a model, the same tap begins playback in the broadcast player.
- English and Hindi select the matching saved on-device model. Other app languages retain the device voice until an on-device pronunciation model is available for that language.

## Performance design

Model inference now runs in `js/tts-piper-worker.js`, separate from the interface thread. The active page can keep scrolling, animating and responding to touch while audio is prepared. The worker and model loader are included in the service-worker shell.

The player uses shorter intentional joins between passages and duration-scale pacing rather than browser time-stretching. This keeps a clear, fluent delivery without an artificially rushed sound.

## Test before release

1. On a fresh phone profile, open any book and tap Listen. Confirm that the model setup appears before speech.
2. Download the Basic model. Confirm download progress, then that playback begins in the broadcast player with speed, queue and sleep controls.
3. While a longer lesson is preparing, swipe the page and open the player. The interface must remain responsive.
4. Repeat from Kids mode with the same downloaded language model.
5. Open a book from Today and use the hero Listen button. It must open the same broadcast player, not a separate floating narrator.

No database migration is added in v338. `UPDATE-v337-reading-sync.sql` is still required once for cross-device reading-state sync if it is not live already.
