package com.nextmail.common;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Controller forwarding client-side Single Page Application (SPA) routes to index.html,
 * while allowing Spring Boot REST APIs (/api/**), Actuator (/actuator/**), and WebSockets (/ws/**)
 * to be processed without collision.
 */
@Controller
public class SpaWebController {

    @GetMapping(value = {
            "/login",
            "/register",
            "/inbox",
            "/sent",
            "/drafts",
            "/starred",
            "/archive",
            "/spam",
            "/trash",
            "/thread/**",
            "/settings/**"
    })
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}
