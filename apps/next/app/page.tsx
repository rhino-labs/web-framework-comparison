import { HomePage, homeData } from '@bench/react-ui'
import { Link } from './link'

export default function Home() {
  return <HomePage data={homeData()} Link={Link} />
}
