import { type ImageProps, getImageProps } from 'next/image'
import { getIntrinsicFromImageSrc } from '../../intrinsicWidth'
import getStringSrc from './getStringSrc'
import imageLoader from './imageLoader'

export type ImgProps = ReturnType<typeof getImageProps>

const getOptimizedImageProps = (props: ImageProps): ImgProps => {
  const srcStr = getStringSrc(props.src)
  const intrinsic = getIntrinsicFromImageSrc(props.src)

  return getImageProps({
    ...props,
    loader: props.loader || imageLoader({ intrinsic }),
    ...(props.blurDataURL
      ? { blurDataURL: props.blurDataURL }
      : typeof props.src === 'string' && props.placeholder === 'blur' && props.loader === undefined
        ? { blurDataURL: imageLoader({ intrinsic })({ src: props.src, width: 8, quality: 10 }) }
        : {}),
    unoptimized: props.unoptimized !== undefined ? props.unoptimized : srcStr.endsWith('.svg'),
  })
}

export default getOptimizedImageProps
