import type { ImageLoaderProps } from 'next/dist/shared/lib/image-external'
import { clampWidth } from '../../intrinsicWidth'
import buildOutputInfo from '../../utils/buildOutputInfo'
import getConfig from '../../utils/getConfig'

const config = getConfig()

type LoaderOptions = {
  /** Index into `config.generateFormats` for `<source>` elements that vary format per srcSet. */
  formatIndex?: number | undefined
  /** Intrinsic pixel width of the source image, when known. Used to clamp requested widths so a 400px source never gets asked for `_1920.webp`. */
  intrinsic?: number | undefined
}

const imageLoader =
  (options: LoaderOptions = {}) =>
  ({ src, width }: ImageLoaderProps) => {
    if (process.env.NODE_ENV === 'development') {
      // This doesn't bother optimizing in the dev environment. Next complains if the
      // returned URL doesn't have a width in it, so adding it as a throwaway
      return `${src}?width=${width}`
    }

    const effectiveWidth = clampWidth(src, width, options.intrinsic, config.basePath)
    const outputInfo = buildOutputInfo({ src, width: effectiveWidth, config }).at(options.formatIndex ?? -1)

    if (outputInfo === undefined) {
      throw new Error(`No output info found for ${src}`)
    }

    return `${config.basePath ?? ''}${outputInfo.output}`
  }

export default imageLoader
