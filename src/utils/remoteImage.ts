import { ImageURISource, PixelRatio } from 'react-native';

/**
 * iOS decodes remote/local photos at full resolution unless the request
 * includes a target size. A 12MP avatar shown at 24pt is ~36MB of RGBA
 * and those CALayers are what pushed PlusOne to ~650MB and got
 * backboardd jetsammed (phone lock) on iPhone 11.
 */
export function downsampledSource(
  uri: string,
  displayWidth: number,
  displayHeight = displayWidth,
): ImageURISource {
  const scale = PixelRatio.get();
  return {
    uri,
    width: Math.max(1, Math.round(displayWidth * scale)),
    height: Math.max(1, Math.round(displayHeight * scale)),
  };
}
