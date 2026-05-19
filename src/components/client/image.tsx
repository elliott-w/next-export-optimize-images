import Image, { type ImageProps } from 'next/image'
import React, { forwardRef } from 'react'
import { getIntrinsicFromImageSrc } from '../../intrinsicWidth'
import getStringSrc from '../utils/getStringSrc'
import imageLoader from '../utils/imageLoader'

const CustomImage = forwardRef<HTMLImageElement, ImageProps>((props, forwardedRef) => {
  const srcStr = getStringSrc(props.src)
  const intrinsic = getIntrinsicFromImageSrc(props.src)
  const blurDataURLObj = props.blurDataURL
    ? { blurDataURL: props.blurDataURL }
    : typeof props.src === 'string' && props.placeholder === 'blur' && props.loader === undefined
      ? { blurDataURL: imageLoader({ intrinsic })({ src: props.src, width: 8, quality: 10 }) }
      : {}

  return (
    <Image
      {...props}
      ref={forwardedRef}
      loader={props.loader || imageLoader({ intrinsic })}
      unoptimized={props.unoptimized !== undefined ? props.unoptimized : srcStr.endsWith('.svg')}
      {...blurDataURLObj}
    />
  )
})
CustomImage.displayName = 'CustomImage'

export { default as getOptimizedImageProps } from '../utils/getOptimizedImageProps'
export default CustomImage
