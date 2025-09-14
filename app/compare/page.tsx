'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { generateDesigns, getRandomTile, blobToDataURL } from '../services/design';

type GeneratedDesign = {
  id: string;
  imageUrl: string;
};

export default function ComparePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [originalPhoto, setOriginalPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDesignIndex, setLoadingDesignIndex] = useState<number | null>(null);
  const [designs, setDesigns] = useState<[GeneratedDesign, GeneratedDesign] | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Effect to set initial state from sessionStorage and URL parameters
  useEffect(() => {
    if (!isMounted) return;

    const categories = searchParams.get('categories');
    if (categories) {
      try {
        // Get photo from sessionStorage
        const photo = sessionStorage.getItem('designPhoto');
        if (!photo) {
          throw new Error('No photo found');
        }

        // Validate that it's a proper data URL
        if (!photo.startsWith('data:image/')) {
          throw new Error('Invalid image format');
        }

        setOriginalPhoto(photo);
        setSelectedCategories(categories.split(','));
        
        // Clear the photo from sessionStorage
        sessionStorage.removeItem('designPhoto');
      } catch (error) {
        console.error('Error processing photo data:', error);
        setError('Failed to process photo data');
        router.replace('/');
      }
    } else {
      router.replace('/');
    }
  }, [isMounted, searchParams, router]);

  // Effect to generate designs when photo is available
  useEffect(() => {
    if (originalPhoto) {
      console.log('Photo available, generating designs...');
      generateInitialDesigns();
    }
  }, [originalPhoto]);

  const generateInitialDesigns = async () => {
    if (!originalPhoto) {
      setError('No original photo provided');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Starting initial designs generation');
      
      // Generate two designs in parallel with random tiles
      console.log('Generating designs...');
      const [design1Blob, design2Blob] = await Promise.all([
        generateDesigns(originalPhoto),
        generateDesigns(originalPhoto)
      ]);
      console.log('Successfully generated designs');

      // Convert blobs to data URLs
      console.log('Converting designs to viewable format...');
      const [design1Url, design2Url] = await Promise.all([
        blobToDataURL(design1Blob),
        blobToDataURL(design2Blob)
      ]);

      setDesigns([
        { id: '1', imageUrl: design1Url },
        { id: '2', imageUrl: design2Url }
      ]);
      console.log('Designs ready for display');
    } catch (error) {
      console.error('Failed to generate designs:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate designs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDesignChoice = async (chosenDesign: GeneratedDesign, otherDesign: GeneratedDesign, chosenIndex: number) => {
    if (!originalPhoto) return;
    
    const otherIndex = chosenIndex === 0 ? 1 : 0;
    setLoadingDesignIndex(otherIndex);
    
    try {
      // Generate new design with a random tile
      const newDesignBlob = await generateDesigns(originalPhoto);
      const newDesignUrl = await blobToDataURL(newDesignBlob);

      setDesigns(prevDesigns => {
        if (!prevDesigns) return null;
        const newDesigns: [GeneratedDesign, GeneratedDesign] = [...prevDesigns] as [GeneratedDesign, GeneratedDesign];
        newDesigns[otherIndex] = { id: Date.now().toString(), imageUrl: newDesignUrl };
        return newDesigns;
      });
    } catch (error) {
      console.error('Failed to generate new design:', error);
      setError('Failed to generate new design. Please try again.');
    } finally {
      setLoadingDesignIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <header className="w-full py-6 px-4 flex justify-between items-center">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-white/80 hover:text-white flex items-center gap-2"
        >
          ← Back
        </button>
        <div className="text-white/60 text-sm">
          Choose your preferred design
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-200px)]">
          {isLoading ? (
            <div className="w-full flex items-center justify-center">
              <div className="text-white text-center">
                <div className="mb-4 text-4xl">✨</div>
                <div className="text-xl font-semibold mb-2">Generating designs...</div>
                <div className="text-white/60">Using AI to create your perfect space</div>
              </div>
            </div>
          ) : designs ? (
            <>
              {/* Design Options */}
              {designs.map((design, index) => (
                <div key={design.id} className="w-full lg:w-1/2">
                  {loadingDesignIndex === index ? (
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-black/40 shadow-2xl flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="mb-4 text-4xl">✨</div>
                        <div className="text-xl font-semibold mb-2">Generating new design...</div>
                        <div className="text-white/60">Using AI to create your perfect space</div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDesignChoice(design, designs[index === 0 ? 1 : 0], index)}
                      className="w-full group relative"
                    >
                      <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-black/40 shadow-2xl 
                                   transition-transform duration-200 group-hover:scale-[1.02]">
                        <img
                          src={design.imageUrl}
                          alt={`Design option ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 
                                   group-hover:opacity-100 transition-opacity duration-200">
                        <div className="px-6 py-3 bg-white/90 rounded-full text-black font-semibold 
                                    shadow-lg backdrop-blur-sm">
                          This one is better
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="w-full flex items-center justify-center">
              <div className="text-white/60">
            {error ? (
              <div className="text-red-400">
                <div>Error: {error}</div>
                <button
                  onClick={() => {
                    setError(null);
                    generateInitialDesigns();
                  }}
                  className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20"
                >
                  Retry
                </button>
              </div>
            ) : (
              'Loading...'
            )}
          </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
