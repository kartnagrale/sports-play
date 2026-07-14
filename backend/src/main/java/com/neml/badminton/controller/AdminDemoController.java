package com.neml.badminton.controller;

import com.neml.badminton.service.DemoService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/demo")
public class AdminDemoController {

    private final DemoService demoService;

    public AdminDemoController(DemoService demoService) {
        this.demoService = demoService;
    }

    @PostMapping("/populate")
    public Map<String, Object> populate(@RequestParam(defaultValue = "3") int autoPlay) {
        return demoService.populate(autoPlay);
    }
}
