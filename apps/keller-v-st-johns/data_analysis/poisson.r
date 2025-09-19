library(MASS)

premiums = c(2030, 2111, 2204, 2500, 2536, 2619, 2940, 2942, 3090, 3094, 3214, 3512, 3544, 3710, 3800, 4020, 4355, 4586, 4754, 4888, 4994, 5099, 5357, 5701, 6240, 6673)#, 7234) , 11862)

fit_lnorm <- fitdistr(premiums, "lognormal")
fit_gamma <- fitdistr(premiums, "gamma")

print(paste("Lognormal Log-Likelihood:", fit_lnorm$loglik))
print(paste("Gamma Log-Likelihood:", fit_gamma$loglik))

my_breaks <- seq(0, 12000, by = 1000)

hist(premiums,
     probability = TRUE,
     breaks = my_breaks,
     main = "Lognormal Fit to SHIP Premiums",
     xlab = "Premium Price ($)",
     col = "lightblue")

# Overlay the fitted density curve
curve(dlnorm(x, meanlog = fit_lnorm$estimate["meanlog"], sdlog = fit_lnorm$estimate["sdlog"]),
      col = "red",
      lwd = 2,
      add = TRUE)# Optional: add lines

curve(dgamma(x, shape = fit_gamma$estimate["shape"], rate = fit_gamma$estimate["rate"]),
      col = "blue",
      lwd = 2,
      add = TRUE)# Optional: add lines


prob_over_11k_log_normal <- plnorm(11862,
                       meanlog = fit_lnorm$estimate["meanlog"],
                       sdlog = fit_lnorm$estimate["sdlog"],
                       lower.tail = FALSE) # lower.tail = FALSE directly gives P(X > x)

print(paste0("The log-normal probability of a premium being > $11,862 is: ", round(prob_over_11k_log_normal * 100, 6), "%"))





prob_over_11k_gamma <- pgamma(11862,
                       shape = fit_gamma$estimate["shape"],
                       rate = fit_gamma$estimate["rate"],
                       lower.tail = FALSE) # lower.tail = FALSE directly gives P(X > x)

print(paste0("The gamma probability of a premium being > $11,862 is: ", round(prob_over_11k_gamma * 100, 6), "%"))