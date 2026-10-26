import s from './Hero.module.css'

export function Hero({ title, tagline }: { title: string; tagline: string }) {
  return (
    <section className={s.hero}>
      <h1>{title}</h1>
      <p>{tagline}</p>
    </section>
  )
}
