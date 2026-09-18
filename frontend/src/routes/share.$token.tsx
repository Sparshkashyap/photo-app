import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/share/$token')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/share/$token"!</div>
}
