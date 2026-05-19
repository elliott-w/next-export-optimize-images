import Image, { type ImageProps, getImageProps } from 'next/image'
import React, { forwardRef } from 'react'
import { getIntrinsicFromImageSrc } from '../../intrinsicWidth'
import getConfig from '../../utils/getConfig'
import getStringSrc from '../utils/getStringSrc'
import imageLoader from '../utils/imageLoader'

const config = getConfig()

const Picture = forwardRef<HTMLImageElement, ImageProps>((props, forwardedRef) => {
  const srcStr = getStringSrc(props.src)
  const intrinsic = getIntrinsicFromImageSrc(props.src)

  if (srcStr.endsWith('.svg')) {
    return <Image {...props} ref={forwardedRef} loader={props.loader || imageLoader({ intrinsic })} unoptimized />
  }

  const blurDataURLObj = props.blurDataURL
    ? { blurDataURL: props.blurDataURL }
    : typeof props.src === 'string' && props.placeholder === 'blur' && props.loader === undefined
      ? { blurDataURL: imageLoader({ intrinsic })({ src: props.src, width: 8, quality: 10 }) }
      : {}

  const additionalFormats = [...new Set(config.generateFormats ?? ['webp'])]
  const sources = additionalFormats.map((format, i) => {
    const sourceProps = getImageProps({
      ...props,
      loader: imageLoader({ formatIndex: i, intrinsic }),
    }).props
    return {
      srcSet: sourceProps.srcSet,
      type: `image/${format}`,
      width: sourceProps.width,
      height: sourceProps.height,
      sizes: sourceProps.sizes,
    }
  })

  return (
    <picture>
      {sources.map((source) => (
        <source key={source.type} {...source} />
      ))}
      <Image {...props} ref={forwardedRef} loader={props.loader || imageLoader({ intrinsic })} {...blurDataURLObj} />
    </picture>
  )
})
Picture.displayName = 'Picture'

export default Picture
