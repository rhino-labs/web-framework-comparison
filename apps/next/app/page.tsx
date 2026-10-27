import { homeData } from '@bench/content/server'
import { HomePage } from '@bench/react-ui'
import { Link } from './link'

export default function Home() {
  return <HomePage data={homeData()} Link={Link} />
}
