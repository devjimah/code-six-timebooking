// "How it works" as a swipeable row of steps, with a slight parallax on the photos while it moves.
import * as React from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@workspace/ui/components/carousel"
import approvePhoto from "@/assets/landing/flow-approve.webp"
import bookPhoto from "@/assets/landing/flow-book.webp"
import checkPhoto from "@/assets/landing/flow-check.webp"
import forecastPhoto from "@/assets/landing/flow-forecast.webp"
import orderPhoto from "@/assets/landing/flow-order.webp"

const STEPS = [
  { key: "order", photo: orderPhoto },
  { key: "book", photo: bookPhoto },
  { key: "check", photo: checkPhoto },
  { key: "approve", photo: approvePhoto },
  { key: "forecast", photo: forecastPhoto },
] as const
const PARALLAX_PERCENT = 8

/** Shifts each photo by how far its slide is from the middle. Written to the DOM directly, so scrolling stays smooth. */
function applyParallax(api: NonNullable<CarouselApi>) {
  const viewport = api.rootNode().getBoundingClientRect()
  for (const slide of api.slideNodes()) {
    const box = slide.getBoundingClientRect()
    const offset = (box.left + box.width / 2 - (viewport.left + viewport.width / 2)) / viewport.width
    const photo = slide.querySelector("img")
    if (photo) photo.style.transform = `scale(1.2) translateX(${(-offset * PARALLAX_PERCENT).toFixed(2)}%)`
  }
}

export function FlowCarousel({ heading }: { heading: React.ReactNode }) {
  const { t } = useTranslation()
  const [api, setApi] = React.useState<CarouselApi>()
  const [selected, setSelected] = React.useState(0)
  const [snaps, setSnaps] = React.useState<number[]>([])

  React.useEffect(() => {
    if (!api) return
    const parallax = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const onSelect = () => setSelected(api.selectedScrollSnap())
    const onReInit = () => {
      setSnaps(api.scrollSnapList())
      onSelect()
      if (parallax) applyParallax(api)
    }
    const onScroll = () => {
      if (parallax) applyParallax(api)
    }
    onReInit()
    api.on("select", onSelect).on("reInit", onReInit).on("scroll", onScroll)
    return () => {
      api.off("select", onSelect).off("reInit", onReInit).off("scroll", onScroll)
    }
  }, [api])

  return (
    <Carousel setApi={setApi} opts={{ align: "start" }} className="grid gap-8" aria-label={t("landing.how.title")}>
      <div className="flex items-end justify-between gap-4">
        {heading}
        <div className="hidden shrink-0 gap-2 sm:flex">
          <CarouselPrevious className="static translate-y-0" aria-label={t("landing.how.previous")} />
          <CarouselNext className="static translate-y-0" aria-label={t("landing.how.next")} />
        </div>
      </div>
      <CarouselContent>
        {STEPS.map((step, index) => (
          <CarouselItem key={step.key} className="basis-[85%] sm:basis-1/2 lg:basis-[38%]">
            <Card className="h-full pt-0">
              <div className="aspect-[16/10] overflow-hidden">
                <img src={step.photo} alt="" loading="lazy" className="size-full scale-[1.2] object-cover" />
              </div>
              <div className="grid gap-1 px-4">
                <span className="text-primary font-mono text-xs">{index + 1}</span>
                <span className="font-medium">{t(`landing.how.${step.key}.title`)}</span>
                <span className="text-muted-foreground">{t(`landing.how.${step.key}.text`)}</span>
              </div>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="flex justify-center">
        {snaps.map((_, index) => (
          <Button
            key={index}
            variant="ghost"
            size="icon-xs"
            aria-label={t("landing.how.goTo", { number: index + 1 })}
            aria-current={index === selected || undefined}
            onClick={() => api?.scrollTo(index)}
          >
            <span
              className={`size-1.5 rounded-full transition-colors ${index === selected ? "bg-primary" : "bg-foreground/20"}`}
            />
          </Button>
        ))}
      </div>
    </Carousel>
  )
}
