import { createElement, type ComponentProps } from "react"

// Local primitives for this Tailwind-only scaffold; no external design system is installed.
export function Button(props: ComponentProps<"button">) {
  return createElement("button", { type: "button", ...props })
}
export function Input(props: ComponentProps<"input">) {
  return createElement("input", props)
}
export function Select(props: ComponentProps<"select">) {
  return createElement("select", props)
}
export function Textarea(props: ComponentProps<"textarea">) {
  return createElement("textarea", props)
}
export function Link(props: ComponentProps<"a">) {
  return createElement("a", props)
}
export function Heading1(props: ComponentProps<"h1">) {
  return createElement("h1", props)
}
export function Heading2(props: ComponentProps<"h2">) {
  return createElement("h2", props)
}
export function Heading3(props: ComponentProps<"h3">) {
  return createElement("h3", props)
}
