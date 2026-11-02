// The top of the landing page: photos that change by themselves behind the headline and the example order.
// It does not pause on hover, because a mouse usually rests somewhere on a hero. The button stops it instead.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import Fade from "embla-carousel-fade"
import { Pause, Play } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@workspace/ui/components/carousel"
import { Progress } from "@workspace/ui/components/progress"
import bookPhoto from "@/assets/landing/hero-book.webp"
import checkPhoto from "@/assets/landing/hero-check.webp"
import reorderPhoto from "@/assets/landing/hero-reorder.webp"
import { ExampleOrder } from "@/pages/landing/example-order.tsx"
import { useAutoplay } from "@/pages/landing/use-autoplay.ts"

const SLIDES = [
  { key: "book", photo: bookPhoto },
  { key: "check", photo: checkPhoto },
  { key: "reorder", photo: reorderPhoto },
] as const
const SLIDE_MS = 6000

export function HeroCarousel() {
  const { t } = useTranslation()
  const [api, setApi] = React.useState<CarouselApi>()
  const [plugins] = React.useState(() => [Fade()])
  const [selected, setSelected] = React.useState(0)
  const advance = React.useCallback(() => api?.scrollNext(), [api])
  const { paused, setPaused, progress, restart, containerRef } = useAutoplay(advance, SLIDE_MS)

  React.useEffect(() => {
    if (!api) return
    const onSelect = () => {
      setSelected(api.selectedScrollSnap())
      restart()
    }
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api, restart])

  return (
    <section ref={containerRef} className="relative isolate overflow-hidden bg-black">
      {/* Only decoration: the buttons below choose the slide, and the words carry the meaning. */}
      <Carousel
        setApi={setApi}
        plugins={plugins}
        opts={{ loop: true, duration: 40, watchDrag: false }}
        aria-hidden
        className="absolute inset-0 -z-10 *:data-[slot=carousel-content]:h-full"
      >
        <CarouselContent className="ml-0 h-full">
          {SLIDES.map((slide, index) => (
            <CarouselItem key={slide.key} className="h-full pl-0">
              <img
                src={slide.photo}
                alt=""
                fetchPriority={index === 0 ? "high" : "auto"}
                className={`size-full object-cover ${index === selected ? "motion-safe:animate-in motion-safe:zoom-in-110 motion-safe:duration-[6000ms] motion-safe:ease-out" : ""}`}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {/* Keeps the white text readable on every photo, in light and dark mode. */}
      <div className="absolute inset-0 -z-10 bg-black/65 lg:bg-transparent lg:bg-linear-to-r lg:from-black/85 lg:via-black/60 lg:to-black/40" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-linear-to-t from-black/80 to-transparent" />

      <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-5xl flex-col justify-between gap-12 px-6 py-12">
        <div className="grid flex-1 items-center gap-12 lg:grid-cols-2">
          <div className="grid justify-items-start gap-6 text-white">
            <h1 className="text-4xl font-medium tracking-tight text-balance md:text-5xl">{t("landing.headline")}</h1>
            {/* Only announced once it stops moving; otherwise a screen reader would be interrupted every few seconds. */}
            <p className="min-h-21 text-lg text-balance text-white/85 sm:min-h-14" aria-live={paused ? "polite" : "off"}>
              {t(`landing.hero.${SLIDES[selected]!.key}.text`)}
            </p>
            <Button size="lg" asChild>
              <Link to="/login">{t("login.submit")}</Link>
            </Button>
          </div>
          <ExampleOrder />
        </div>

        <div className="flex items-start gap-2 sm:gap-4">
          <nav className="grid flex-1 grid-cols-3 gap-2 sm:gap-4" aria-label={t("landing.hero.label")}>
            {SLIDES.map((slide, index) => (
              <button
                key={slide.key}
                type="button"
                aria-current={index === selected || undefined}
                onClick={() => api?.scrollTo(index)}
                className={`focus-visible:ring-ring/50 grid gap-2 rounded-sm py-1 text-left text-xs transition-colors outline-none hover:text-white focus-visible:ring-3 sm:text-sm ${index === selected ? "text-white" : "text-white/60"}`}
              >
                <span aria-hidden>
                  <Progress value={index === selected ? progress : 0} className="bg-white/25" />
                </span>
                {t(`landing.hero.${slide.key}.label`)}
              </button>
            ))}
          </nav>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white hover:bg-white/15 hover:text-white"
            aria-label={paused ? t("landing.hero.play") : t("landing.hero.pause")}
            title={paused ? t("landing.hero.play") : t("landing.hero.pause")}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
          </Button>
        </div>
      </div>
    </section>
  )
}
