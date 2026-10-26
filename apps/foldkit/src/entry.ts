import { Runtime } from 'foldkit'

import '@bench/content/styles.css'

import { Flags, Message, Model, init, subscriptions, update } from './main'
import { view } from './view'

const application = Runtime.makeApplication({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
})

Runtime.hydrate(application)
