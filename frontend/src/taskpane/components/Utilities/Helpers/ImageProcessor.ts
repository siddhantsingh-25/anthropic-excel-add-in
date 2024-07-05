export const processImage = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (readEvent) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          const maxWidth = 800;
          const maxHeight = 600;
          let width = image.width;
          let height = image.height;

          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }

          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;
          context?.drawImage(image, 0, 0, width, height);
          const dataURL = canvas.toDataURL();
          resolve(dataURL);
        };
        image.src = readEvent.target?.result as string;
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      reject(error);
    }
  });
};
