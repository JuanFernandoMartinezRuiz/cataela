import ImagePlaceholder from '../common/ImagePlaceholder'

export default function ProductGallery({ product, selectedImage, onSelectImage }) {
  const gallery = [
    ...(product.main_image_url ? [{ id: 'main', image_url: product.main_image_url }] : []),
    ...(product.gallery ?? []),
  ].filter(
    (image, index, collection) =>
      image.image_url &&
      collection.findIndex((candidate) => candidate.image_url === image.image_url) === index,
  )

  return (
    <div className="space-y-4">
      <div className="card-dashed-blue overflow-hidden p-4">
        {selectedImage ? (
          <img
            src={selectedImage}
            alt={product.name}
            className="h-[420px] w-full rounded-[1.75rem] object-cover md:h-[520px]"
          />
        ) : (
          <ImagePlaceholder label={product.name} className="h-[420px] w-full md:h-[520px]" />
        )}
      </div>

      {gallery.length > 1 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {gallery.map((image) => {
            const isActive = selectedImage === image.image_url

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => onSelectImage(image.image_url)}
                className={`overflow-hidden rounded-[1.25rem] border p-1 transition ${
                  isActive
                    ? 'border-mist bg-mist/10 shadow-soft'
                    : 'border-white/70 bg-white/70 hover:-translate-y-0.5 hover:bg-white'
                }`}
              >
                <img
                  src={image.image_url}
                  alt={product.name}
                  className="h-20 w-full rounded-[1rem] object-cover sm:h-24"
                />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
