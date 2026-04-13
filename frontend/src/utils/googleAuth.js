const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export const initGoogleAuth = () => {
  return new Promise((resolve) => {
    if (window.google) {
      resolve()
      return
    }

    // Load Google Identity Services script
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    document.body.appendChild(script)
  })
}

export const renderGoogleButton = (elementId, callback) => {
  if (window.google) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        // Pass the credential to the provided callback
        callback(response.credential)
      },
    })

    window.google.accounts.id.renderButton(
      document.getElementById(elementId),
      {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: '400', // Matches the width of the login form buttons
      }
    )
  }
}

export const promptOneTap = () => {
  if (window.google) {
    window.google.accounts.id.prompt()
  }
}
