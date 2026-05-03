import router from '@adonisjs/core/services/router'

router.get('/', () => {
  return {
    ok: true,
    message: 'Open /logs for the log viewer.',
  }
})
