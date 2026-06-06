<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const supabase = useSupabaseClient()
useHead({ title: 'Masuk — Toko Arijaya' })
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function login() {
  error.value = ''
  loading.value = true
  const { error: err } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  loading.value = false
  if (err) {
    error.value = 'Email atau password salah. Coba lagi.'
  } else {
    await navigateTo('/')
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-4 lg:p-6">
    <Card class="w-full max-w-md">
      <CardHeader class="text-center pb-2">
        <CardTitle class="text-4xl font-bold">Toko Arijaya</CardTitle>
        <CardDescription class="text-xl mt-2">Silakan masuk untuk melanjutkan</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="flex flex-col gap-6" @submit.prevent="login">
          <FieldGroup>
            <Field>
              <FieldLabel class="text-xl">Email</FieldLabel>
              <Input
                id="email"
                v-model="email"
                type="email"
                placeholder="contoh@email.com"
                class="h-14 text-xl"
                required
                autocomplete="email"
              />
            </Field>
            <Field>
              <FieldLabel class="text-xl">Password</FieldLabel>
              <Input
                id="password"
                v-model="password"
                type="password"
                placeholder="Password"
                class="h-14 text-xl"
                required
                autocomplete="current-password"
              />
            </Field>
          </FieldGroup>

          <p v-if="error" class="text-destructive text-lg font-medium text-center">
            {{ error }}
          </p>

          <Button
            type="submit"
            class="h-16 text-xl w-full"
            :disabled="loading"
          >
            <Spinner v-if="loading" data-icon="inline-start" />
            {{ loading ? 'Sedang Masuk...' : 'Masuk' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
