import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/trash')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/trash"!</div>
}
