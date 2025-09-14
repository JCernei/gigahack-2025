const API_BASE_URL = 'http://localhost:8000';

/**
 * Helper function to convert data URL to File
 */
function dataURLtoFile(dataUrl: string, filename: string): File {
  try {
    // First, check if this is a valid data URL
    if (!dataUrl.startsWith('data:')) {
      console.error('Invalid data URL format:', dataUrl.substring(0, 50) + '...');
      throw new Error('Invalid data URL format');
    }

    // Split the data URL into mime type and base64 data
    const [header, base64Data] = dataUrl.split(',');
    if (!header || !base64Data) {
      throw new Error('Invalid data URL format: missing header or data');
    }

    // Extract the mime type
    const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
    
    // Make sure we're dealing with base64 data
    if (!header.includes(';base64')) {
      throw new Error('Data URL is not base64 encoded');
    }

    try {
      // Decode the base64 data
      const bstr = atob(base64Data);
      const u8arr = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) {
        u8arr[i] = bstr.charCodeAt(i);
      }
      return new File([u8arr], filename, { type: mime });
    } catch (decodeError) {
      console.error('Failed to decode base64 data:', decodeError);
      throw new Error('Failed to decode image data');
    }
  } catch (error) {
    console.error('Error in dataURLtoFile:', error);
    throw error;
  }
}

/**
 * Helper function to convert Blob to data URL
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => {
      console.error('Error in blobToDataURL:', error);
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetch a random tile from the API
 */
export async function getRandomTile(): Promise<string> {
  try {
    console.log('Fetching random tile...');
    const response = await fetch(`${API_BASE_URL}/tiles`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`Failed to get random tile: ${response.status} ${errorText}`);
    }

    console.log('Successfully received random tile');
    const blob = await response.blob();
    return await blobToDataURL(blob);
  } catch (error) {
    console.error('Error in getRandomTile:', error);
    throw error;
  }
}

/**
 * Generate designs by combining the original image with a tile image
 */
export async function generateDesigns(originalImage: string, tileImage?: string): Promise<Blob> {
  try {
    console.log('Starting design generation...');
    
    // Convert base64 data URLs to File objects
    const originalFile = dataURLtoFile(originalImage, 'original.jpg');
    const formData = new FormData();
    formData.append('files', originalFile);

    // If a specific tile image is provided, use it
    if (tileImage) {
      const tileFile = dataURLtoFile(tileImage, 'tile.jpg');
      formData.append('files', tileFile);
    }

    // Use a different endpoint based on whether we want a random tile or not
    const endpoint = tileImage ? 'generate' : 'generate-random';
    
    console.log('Sending request to API...');
    const response = await fetch(`${API_BASE_URL}/tiles/${endpoint}/`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`Failed to generate design: ${response.status} ${errorText}`);
    }

    console.log('Successfully received generated design');
    return await response.blob();
  } catch (error) {
    console.error('Error in generateDesigns:', error);
    throw error;
  }
}
