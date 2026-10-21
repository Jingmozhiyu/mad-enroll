package com.jing.monitor.service;

import com.jing.monitor.model.VisitStat;
import com.jing.monitor.repository.VisitStatRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j

public class VisitStatService {

    public final VisitStatRepository visitStatRepository;

    /**
     * Record a personal website visit with the visitor's IP address.
     *
     * @param ip visitor IPv4 or IPv6 address
     */
    public void visitFromPersonalWebsite(String ip){
        VisitStat stat = new VisitStat();
        stat.setIp(ip);
        visitStatRepository.save(stat);
    }
}
