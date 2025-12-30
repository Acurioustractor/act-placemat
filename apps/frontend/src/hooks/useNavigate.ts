export function useNavigate() {
  return (search: string) => {
    const params = new URLSearchParams(search.replace(/^\?/, ''))
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
    const event = new CustomEvent('tab-change', { detail: params.toString() })
    window.dispatchEvent(event)
  }
}
