import NextImage, { type ImageProps } from 'next/dist/shared/lib/image-external'
import React, { forwardRef } from 'react'
import { getIntrinsicFromImageSrc } from '../../intrinsicWidth'
import getStringSrc from '../utils/getStringSrc'
import imageLoader from '../utils/imageLoader'

const TurboImage = forwardRef<HTMLImageElement, ImageProps>((props, forwardedRef) => {
  const srcStr = getStringSrc(props.src)
  const intrinsic = getIntrinsicFromImageSrc(props.src)
  const blurDataURLObj = props.blurDataURL
    ? { blurDataURL: props.blurDataURL }
    : typeof props.src === 'string' && props.placeholder === 'blur' && props.loader === undefined
      ? { blurDataURL: imageLoader({ intrinsic })({ src: props.src, width: 8, quality: 10 }) }
      : {}

  return (
    <NextImage
      {...props}
      ref={forwardedRef}
      loader={props.loader || imageLoader({ intrinsic })}
      unoptimized={props.unoptimized !== undefined ? props.unoptimized : srcStr.endsWith('.svg')}
      {...blurDataURLObj}
    />
  )
})
TurboImage.displayName = 'TurboImage'

export default TurboImage
