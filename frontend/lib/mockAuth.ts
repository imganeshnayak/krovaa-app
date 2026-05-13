export const mockSignUp = async (email: string, password: string, fullName: string) => {
  // Simulate a delay for the mock API call
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock validation logic
  if (!email || !password || !fullName) {
    return { error: 'All fields are required.' };
  }

  if (!email.includes('@')) {
    return { error: 'Invalid email address.' };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  // Simulate successful registration
  return { error: null };
};

export const mockSignIn = async (email: string, password: string) => {
  // Simulate a delay for the mock API call
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock validation logic
  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  if (!email.includes('@')) {
    return { error: 'Invalid email address.' };
  }

  if (password !== 'password123') { // Example mock password
    return { error: 'Incorrect email or password.' };
  }

  // Simulate successful login
  return { error: null };
};