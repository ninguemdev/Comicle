/**
 * Loads an image ready for `drawImage`. Uses `load` rather than `HTMLImageElement.decode()`,
 * which Chrome holds back while the tab is hidden: a player coming back with the game in a
 * background tab would wait for nothing.
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error('Imagem ilegível'));
    };
    image.src = url;
  });
}
